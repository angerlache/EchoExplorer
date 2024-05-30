"""BatDetect2 command line interface."""
import os

import click

from batdetect2 import api
from batdetect2.detector.parameters import DEFAULT_MODEL_PATH
from batdetect2.types import ProcessingConfiguration
from batdetect2.utils.detector_utils import save_results_to_file

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))


INFO_STR = """
BatDetect2 - Detection and Classification
    Assumes audio files are mono, not stereo.
    Spaces in the input paths will throw an error. Wrap in quotes.
    Input files should be short in duration e.g. < 30 seconds.
"""


@click.group()
def cli():
    """BatDetect2 - Bat Call Detection and Classification."""
    click.echo(INFO_STR)


@cli.command() 
@click.argument(
    "audio_dir",
    type=click.Path(exists=True),
)
@click.argument(
    "ann_dir",
    type=click.Path(exists=False),
)
@click.argument(
    "detection_threshold",
    type=float,
)
@click.argument(
    "user",
    type=str,
)
@click.option(
    "--cnn_features",
    is_flag=True,
    default=False,
    help="Extracts CNN call features",
)
@click.option(
    "--spec_features",
    is_flag=True,
    default=False,
    help="Extracts low level call features",
)
@click.option(
    "--time_expansion_factor",
    type=int,
    default=1,
    help="The time expansion factor used for all files (default is 1)",
)
@click.option(
    "--quiet",
    is_flag=True,
    default=False,
    help="Minimize output printing",
)
@click.option(
    "--save_preds_if_empty",
    is_flag=True,
    default=False,
    help="Save empty annotation file if no detections made.",
)
@click.option(
    "--model_path",
    type=str,
    default=DEFAULT_MODEL_PATH,
    help="Path to trained BatDetect2 model",
)
@click.option(
    "--voting",
    is_flag = True,
    default=False,
    help="the ai is called before AI voting, changes output type by changing argument return_raw_preds" 

)
def detect(
    audio_dir: str,
    ann_dir: str,
    detection_threshold: float,
    user: str,
    time_expansion_factor: int,
    **args,
):
    """Detect bat calls in files in AUDIO_DIR and save predictions to ANN_DIR.

    DETECTION_THRESHOLD is the detection threshold. All predictions with a
    score below this threshold will be discarded. Values between 0 and 1.

    Assumes audio files are mono, not stereo.

    Spaces in the input paths will throw an error. Wrap in quotes.

    Input files should be short in duration e.g. < 30 seconds.
    """
    click.echo(f"Loading model: {args['model_path']}")
    model, params = api.load_model(args["model_path"])

    click.echo(f"\nInput directory: {audio_dir}")
    files = api.list_audio_files(audio_dir)

    click.echo(f"Number of audio files: {len(files)}")
    click.echo(f"\nSaving results to: {ann_dir}")

    config = api.get_config(
        **{
            **params,
            **args,
            "time_expansion": time_expansion_factor,
            "spec_slices": False,
            "chunk_size": 2,
            "detection_threshold": detection_threshold,
            "return_raw_preds" : args["voting"],
        }
    )

    if not args["quiet"]:
        print_config(config)

    # process files
    error_files = []
    for index, audio_file in enumerate(files):
        try:
            if not args["quiet"]:
                click.echo(f"\n{index} {audio_file}")

            results = api.process_file(audio_file, model, config=config)
            
            
            if args["voting"] and len(results["start_times"]) > 0:
                stimes = results["start_times"]
                etimes = results["end_times"]
                detprob = results["det_probs"]
                classprobs= results["class_probs"]

                results_path = audio_file.replace(audio_dir, ann_dir)

                audiosplit = audio_file
                for delimiter in ['/','\\']:
                    audiosplit = " ".join(audiosplit.split(delimiter))
                audiosplit = audiosplit.split(" ")
                import os

                if not os.path.isdir(os.path.dirname(results_path)):
                    os.makedirs(os.path.dirname(results_path))
                with open("results/" + audiosplit[1] +'/classification_data_' + audiosplit[2].split('.')[0] + '.csv', 'w') as file:
                    head_str = 'file,start,end,batproba'
                    for i in range(len(classprobs)):
                        head_str += ',' + str(i)
                    file.write(head_str + '\n')
                    for i in range(len(stimes)):
                        row_str = str(audiosplit[2]) + ',' + str(stimes[i]) + ',' +  str(etimes[i]) + ',' +  str(detprob[i])
                        for j in range(len(classprobs)):
                            row_str += ',' + str(classprobs[j][i])
                        file.write(row_str + '\n')




            elif args["save_preds_if_empty"] or (
                'pred_dict' in results and len(results["pred_dict"]["annotation"]) > 0
            ):
                results_path = audio_file.replace(audio_dir, ann_dir)
 
                audiosplit = audio_file
                for delimiter in ['/','\\']:
                    audiosplit = " ".join(audiosplit.split(delimiter))

                save_results_to_file(results, results_path, ann_dir+'/'+audiosplit[2])
                #save_results_to_file(results, results_path, ann_dir+'/classification_result_'+audio_file.split('/')[2])
        except (RuntimeError, ValueError, LookupError) as err:
            error_files.append(audio_file)
            click.secho(f"Error processing file!: {err}", fg="red")
            raise err

    click.echo(f"\nResults saved to: {ann_dir}")

    import os

    # Directory containing CSV files
    directory = ann_dir

    # Output file to store concatenated data
    output_file = ann_dir + '/classification_result_'+user+'.csv'
    l = os.listdir(directory)
    # Iterate through each file in the directory
    with open(output_file, 'w') as output_csv:
        output_csv.write("filename,start,end,class,probability")
        for file_name in l:
            if file_name != 'classification_result_'+user+'.csv' and file_name.endswith('.csv'):
                with open(os.path.join(directory, file_name), 'r') as input_csv:
                    # Skip the header line if it's not the first file
                    #if output_csv.tell() != 0:
                    next(input_csv)
                    # Copy the contents of the file to the output file
                    for line in input_csv:
                        line = line.replace('Barbastellus barbastellus', 'Barbastella barbastellus')
                        output_csv.write(line)

    if len(error_files) > 0:
        click.secho("\nUnable to process the follow files:", fg="red")
        for err in error_files:
            click.echo(f"  {err}")


def print_config(config: ProcessingConfiguration):
    """Print the processing configuration."""
    click.echo("\nProcessing Configuration:")
    click.echo(f"Time Expansion Factor: {config.get('time_expansion')}")
    click.echo(f"Detection Threshold: {config.get('detection_threshold')}")


if __name__ == "__main__":
    cli()
