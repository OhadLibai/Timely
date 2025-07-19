# Model state management:

### The Setup Phase (Done Once Before Launching the App)

This is the foundational work required to prepare the data for our TIFU-KNN model. Think of this as a one-time data engineering task.

Step 1: Raw Data Processing. The preprocess.py script is run to process the original Instacart CSV files into a single, clean instacart.csv file.

Step 2: Data Structuring. The create_model_data.py script takes the processed instacart.csv and splits it into the instacart_history.csv and instacart_future.csv files. It also generates the crucial data_history.json file, which formats the purchase history for each user in a way the TIFU-KNN model can read.

Step 3: User Segmentation. The keyset_fold.py script is run to divide the users from the history and future CSVs into recommender, validation, and test sets. This creates the instacart_keyset_0.json file.

Step 4: Pre-computation of User Vectors. When the ML microservice starts up, it should immediately load the data_history.json and run the temporal_decay_sum_history function for every user. This pre-computes all user vectors and holds them in memory for fast access.

#

### The Single Prediction Workflow (What Happens in Real-Time)
This is the flow that occurs every time a user requests a new predicted basket.

Step 1: User Request. A user logs into the app and clicks the "Generate My Basket" button. This action sends a request to our backend, which then forwards it to the ML microservice.

Step 2: K-Nearest Neighbors (KNN) Search. The ML microservice takes the pre-computed vector for the requesting user (the "query" vector) and performs a KNN search against all the other pre-computed user vectors in memory to find the most similar users. This is a very fast operation because the heavy lifting of vector calculation has already been done.

Step 3: History Merging. The system then uses the merge_history function to combine the user's own historical vector with the vectors of their nearest neighbors. This creates a new, enriched vector that represents a blend of the user's habits and the habits of similar shoppers.

Step 4: Prediction Generation. The final merged vector is sorted, and the top 100 items are selected to form the predicted basket.

Step 5: Display to User. The list of predicted products is sent back to the frontend and displayed to the user on the "Predicted Basket" page, where they can edit it or add it to their cart.

#
### Handling New Orders
For the purpose of demonstrating the app on the static Instacart dataset, we do not need to dynamically handle "new" orders.

Static Dataset: Our goal is to prove the model works based on the provided historical data. When we "seed" a user with an Instacart ID, we are creating a user whose entire purchase history is already known and fixed within the dataset.

Simulating "Next Basket": The model's task is to predict the train basket based on the prior baskets. The on-demand approach handles this perfectly. When we run a prediction for user_id: 42, our service simply reads all of that user's past orders and uses them to predict their known "next" order. There are no new orders being created that the model needs to adapt to in real-time.
