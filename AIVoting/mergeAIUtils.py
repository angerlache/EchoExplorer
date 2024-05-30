import pandas as pd
import numpy as np
def filter_close_time(df, time_col, bat_col, time_tolerance):
    filtered_entries = []
    checked = set()
    
    for i, row in df.iterrows():
        if i in checked:
            continue
        
        current_time = row[time_col]
        close_indices = df.index[(df[time_col] >= current_time - time_tolerance) & (df[time_col] <= current_time + time_tolerance)].tolist()
        for ele in checked:
            if ele in close_indices:
                close_indices.remove(ele)
            
        max_bat_index = df.loc[close_indices][bat_col].idxmax()
        
        filtered_entries.append(df.loc[max_bat_index])
        checked.update(close_indices)
    
    return pd.DataFrame(filtered_entries)



def preprocess(ai, df):
    #Normalise probabilities
    if(ai == "BatML"):
        nbclasses = 7
    elif(ai == "Batdetect"):
        nbclasses = 17
    for i, row in df.iterrows():
        nrow = []
        if (ai == "BatML"):
            probsum = row["0":str(nbclasses-1)].sum()
        elif (ai == "Batdetect"):
            probsum = row["batproba"] 

        if probsum != 0:
            df.loc[i, "0":str(nbclasses-1)] = row["0":str(nbclasses-1)] / probsum

    return df            


def merge(df1, df2, time_tolerance):
    newresults = []
    checked = set()

    if df1.empty:
        df1 = pd.DataFrame(columns=['filename','time','batproba','0','1','2','3','4','5','6'])
    
    if df2.empty:
        df2 = pd.DataFrame(columns=['file','start','end','batproba','0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'])
    l = sorted(list(df1["time"]) + list(df2["start"]))    

    for time in l:
        if(time not in checked):
            row1 = df1[(df1['time'] >= time - time_tolerance) & (df1['time'] <= time + time_tolerance)]
            if(row1.empty):
                None
            else:
                row1 = row1.iloc[0]
                checked.update([row1["time"]])

            row2 = df2[(df2['start'] >= time - time_tolerance) & (df2['start'] <= time + time_tolerance)]
            if(row2.empty):
                None
            else:
                row2 = row2.iloc[0]
                checked.update([row2["start"]])
            

            newl = {
                "timestamp": round(time,3) ,
                "batml_time": row1['time'] if not row1.empty else None,
                "batml_batproba": row1['batproba'] if not row1.empty else None,
                "batml_species": list(row1["0":]) if not row1.empty else [None] * 7,
                "batdetect_start": row2['start'] if not row2.empty else None,
                "batdetect_batproba": row2['batproba'] if not row2.empty else None,
                "batdetect_species": list(row2["0":]) if not row2.empty else [None] * 17
            }
            newresults.append(newl)

    return pd.DataFrame(newresults)


def addGroupProba(df, table):
    newcol = []
    for index, row in df.iterrows():
        prob = []
        if(not pd.isna(row["batdetect_start"])):
            for i in table:
                c = 0
                for j in table[i]:
                    c += row["batdetect_species"][j]
                
                prob.append(c)
        else:
            prob = [None]*7
        newcol.append(prob)
    df["groupProbas"]= newcol
    return df

def compute(df, groups,species, batmlbatprob,groupprob,batdetectbatprob,batdetectspeprob,totalprob,batmlWeight,batdetectWeight):
    preds = []
    for i, row in df.iterrows():

        newr = []
        if (pd.isna(row["batdetect_start"]) or row["batdetect_start"] == None):  
            if float(row["batml_batproba"]) > batmlbatprob:
                m = max(row["batml_species"])
                if(m > groupprob):
                    newr.append(row["timestamp"])
                    newr.append(row["timestamp"])
                    newr.append(groups[row["batml_species"].index(m)])
                    newr.append(m * row["batml_batproba"])


        elif (pd.isna(row["batml_time"]) or row["batml_time"]==None): 
            if float(row["batdetect_batproba"]) >  batdetectbatprob:
                m = max(row["groupProbas"])
                if(m> groupprob):
                    mx = max(row["batdetect_species"])
                    newr.append(row["timestamp"])
                    newr.append(row["timestamp"])
                    if(mx>batdetectspeprob):
                        newr.append(species[row["batdetect_species"].index(mx)])
                        newr.append(mx)
                    else:
                        newr.append(groups[row["groupProbas"].index(m)])
                        newr.append(m * row["batdetect_batproba"])
        else:
            proba1 = row["batml_batproba"]
            proba2 = row["batdetect_batproba"]              
            batprob = ((batmlWeight*proba1) + (batdetectWeight*proba2)) 
            if(batprob >= totalprob):
                gproba = []
                for groupid in range(7):   
                    gproba.append(((batmlWeight*row["batml_species"][groupid]) + (batdetectWeight * row["groupProbas"][groupid])))
                
                m = max(gproba)
                if(m > groupprob):
                    mx = max(row["batdetect_species"])
                    newr.append(row["timestamp"])
                    newr.append(row["timestamp"])
                    if(mx>batdetectspeprob):
                        newr.append(species[row["batdetect_species"].index(mx)])
                        newr.append(mx * batprob)
                    else:
                        newr.append(groups[gproba.index(m)])
                        newr.append(m * batprob)
        if(newr != []):
            newr[-1] =round(newr[-1],3) 
            preds.append(newr)

    df = pd.DataFrame(preds, columns = ['Start','End','Spec/Group','ClassificationProba']) 
    return df
