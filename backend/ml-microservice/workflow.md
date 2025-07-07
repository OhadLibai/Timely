Correct Workflow:
1 -> Run preprocess.py
This will read the original Instacart data and create dataset/instacart.csv.

2 -> Run create_model_data.py (the new script)
This will use dataset/instacart.csv to create:
dataset/instacart_history.csv
dataset/instacart_future.csv
dataset/data_history.json

3 -> Run keyset_fold.py
This will now find the history and future CSVs it needs and will create the keyset/instacart_keyset_0.json file.

4 -> Run tifuknn.py
This will now have the dataset/data_history.json and the keyset/instacart_keyset_0.json files it requires to run the model and generate predictions.