# create_model_data.py
import pandas as pd
import json
from tqdm import tqdm

print("Loading the processed data from preprocess.py...")
# Load the output from your preprocess.py script
try:
    baskets = pd.read_csv('dataset/instacart.csv')
except FileNotFoundError:
    print("Error: 'dataset/instacart.csv' not found.")
    print("Please make sure you have run preprocess.py successfully first.")
    exit()

print("Splitting data into history and future sets...")
# The 'eval_set' column is 'train' for the last basket and 'prior' for all others
history_df = baskets[baskets['eval_set'] == 'prior']
future_df = baskets[baskets['eval_set'] == 'train']

# Save the two CSV files needed by keyset_fold.py
history_df.to_csv('dataset/instacart_history.csv', index=False)
future_df.to_csv('dataset/instacart_future.csv', index=False)
print("Successfully created 'instacart_history.csv' and 'instacart_future.csv'.")


print("\nCreating JSON history file for tifuknn.py...")
# Create the data_history.json file needed by tifuknn.py
data_history = {}
# Group by user, then iterate through each user's baskets in order
for user_id, user_df in tqdm(history_df.groupby('user_id'), desc="Processing users"):
    # Sort baskets by order number to maintain sequence
    user_baskets = user_df.sort_values('order_number').groupby('order_number')['product_id'].apply(list).tolist()
    
    # The first item in the list is a placeholder for the user_id itself,
    # followed by the list of baskets.
    data_history[str(user_id)] = [user_id] + user_baskets

# Save the final JSON file
history_file_path = 'dataset/data_history.json'
with open(history_file_path, 'w') as f:
    json.dump(data_history, f)

print(f"Successfully created '{history_file_path}'.")
print("\nData preparation is now complete.")