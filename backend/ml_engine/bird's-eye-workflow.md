# Workflow:

### 1 -> Run preprocess.py
Cleans raw Instacart CSVs, filters bad data.
Creates instacart.csv.
Run in docker build

### 2 -> Run create_model_data.py
Transforms cleaned data into model format
This will use instacart.csv to create:
    dataset/instacart_history.csv
    dataset/instacart_future.csv
    dataset/data_history.json
Run during docker build


### 3 -> Run keyset_fold.py
Creates train/val/test user splits.
Finds the history and future CSVs it needs and will create the instacart_keyset_0.json file.
Run during docker build.

### 4 -> Run ml_engine
The ml_engine expects these files to exist:
data_history.json - User purchase histories
instacart_keyset_0.json - Train/val/test splits + item count
instacart_future.csv - Ground truth for evaluation


# Raw CSVs → preprocess.py → create_model_data.py → keyset_fold.py → ml_engine
