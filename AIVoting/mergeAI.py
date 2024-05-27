import subprocess
import os
import pandas as pd
import mergeAIUtils as utils
import sys
import shutil


#get arguments
username = sys.argv[1] 
time_tolerance = float(sys.argv[2])  # 0.05

#  batmlbatprob : probability of being a bat for ML, probabily of belonging to a group for either,    0.8 0.5
#  probabilty of being a bat for both, probabilty of being a specific specie ml, merged proba      0.6 0.8 0.5
#  add weights to each AIs proba

weight_ML = 0.4
weight_Detect2 = 0.6

batproba_ML = 0.65
batproba_Detect = 0.5
batproba_Both = 0.55

groupproba = 0.6
specproba = 0.7


#specieTables
batdetectSpecies = ['Barbastellus barbastellus', 'Eptesicus serotinus', 'Myotis alcathoe', 'Myotis bechsteinii', 'Myotis brandtii', 'Myotis daubentonii', 'Myotis mystacinus', 'Myotis nattereri', 'Nyctalus leisleri', 'Nyctalus noctula', 'Pipistrellus nathusii', 'Pipistrellus pipistrellus', 'Pipistrellus pygmaeus', 'Plecotus auritus', 'Plecotus austriacus', 'Rhinolophus ferrumequinum', 'Rhinolophus hipposideros']
group_names = ['Barbarg', 'Envsp', 'Myosp', 'Pip35','Pip50', 'Plesp', 'Rhisp']
index = {0:[0], 1:[1,8,9], 2:[2,3,4,5,6,7], 3:[13,14], 4:[10],5:[13,14],6:[15,16]}



#get paths
BatmlInputPath =  "../AI/data/samples/" + username
BatdetectInputPath =   "../batdetect2/samples/" + username


if not os.path.exists(BatmlInputPath):
            os.mkdir(BatmlInputPath)
if not os.path.exists(BatdetectInputPath):
            os.mkdir(BatdetectInputPath)





for filename in os.listdir("samples/"+username):
    shutil.copy2("samples/" + username + "/" + filename, BatmlInputPath)
    shutil.copy2("samples/" + username + "/" + filename, BatdetectInputPath)
#run BatML and delete input

os.chdir('../AI')                               #+ " && rm -rf data/samples/" + username
subprocess.run('{} {} {}'.format('python3', 'run_classifier.py', username)+ " && rm -rf data/samples/" + username,shell=True,check=True)

#run Batdetect2
os.chdir('../batdetect2')
#"source /home/batmen/anthony/myenv/bin/activate && " +   |||  + "&& rm -rf samples/"+username+"/ && rm -rf results/"+username+"/*.wav.csv" 
subprocess.run("source /home/batmen/anthony/myenv/bin/activate && " +  "{} {} {} {} {} {} {}".format("python3", "run_batdetect.py", "samples/"+username, "results/"+username, 0.5, username, "--voting") + "&& rm -rf samples/"+username+"/ && rm -rf results/"+username+"/*.wav.csv", shell=True, check=True)
os.chdir('../batdetect2')

print(os.getcwd())

os.chdir('results/')
os.chdir(username+"/")
batdetectdata= pd.read_csv("classification_result_" + username +".csv")
os.chdir("../../../AI")

os.chdir('results/')
batMLdata= pd.read_csv("classification_data_" + username +".csv")
os.chdir("../../AIVoting")


i = 0
for filename in os.listdir("samples/"+username):
        MLdata = batMLdata[batMLdata["filename"]==filename]
        detectdata = batdetectdata[batdetectdata["file"]==filename]

        
        MLdata = utils.filter_close_time(MLdata, 'time', 'batproba', time_tolerance)
        detectdata = utils.filter_close_time(detectdata, 'start', 'batproba', time_tolerance)



        MLdata = utils.preprocess("BatML",MLdata)
        detectdata = utils.preprocess("Batdetect",detectdata)



        mergedDf = utils.merge(MLdata,detectdata,time_tolerance) 



        newdf = utils.addGroupProba(mergedDf, index)


        preds = utils.compute(newdf, group_names,batdetectSpecies,batproba_ML, groupproba, batproba_Detect, specproba,batproba_Both,weight_ML,weight_Detect2)



        preds.insert(0, "Filename", filename, True)
        if i == 0:
                preds.to_csv("results/"+username+"/classification_result_"+username+".csv",index=False)        
        else:
            preds.to_csv("results/"+username+"/classification_result_"+username+".csv",mode='a', index=False, header=False)
        i+=1