# Key Files from the evaluation Folder

## metrics.py:
This is our foundational metrics library. It includes standard evaluation measures for recommendation systems, such as:

Recall@k: This measures how many of the items a user actually bought were in the top 'k' items our model recommended. For example, if our model recommends 20 items (k=20) and the user's actual next basket contained 10 of those items, the recall would be very high. This is crucial for both of our evaluation requirements.

Precision@k: This metric tells we what proportion of our recommended items were actually purchased by the user. It's a measure of how "on-target" our recommendations are.

F1-Score: This is the harmonic mean of precision and recall, providing a single score that balances both metrics. It's a great top-line metric for our admin dashboard.

NDCG (Normalized Discounted Cumulative Gain): This is a more advanced metric that takes the ranking of the recommended items into account. It gives more weight to items that are recommended higher up in the list, which is very useful for a real-world application like Timely.


## model_performance.py:
This file is where the magic happens for our "Model Performance Stats" feature. It takes the general metrics from metrics.py and applies them in a more nuanced way by considering the concepts of "repetition" and "exploration."

Repetition vs. Exploration: This script can distinguish between recommending items the user has bought before ("repeat") and suggesting new items ("explore"). This is a sophisticated way to evaluate our model that goes beyond simple accuracy. For our admin dashboard, we could display:

Overall model accuracy (e.g., F1-score).

A breakdown of how well the model performs on "repeat" items versus "explore" items. This would be a very impressive and insightful feature for an admin to see.

`How to use it: When our admin triggers a model performance evaluation, our backend can use this script to run the calculations on a sample of users (or all of them) and then send the results to the frontend to be displayed in a dashboard.`


## performance_gain.py:
This script is designed to measure the added value of our TIFU-KNN model over a simpler, baseline approach (like just recommending the most popular items). This is a powerful way to demonstrate the effectiveness of our machine learning algorithm.

`For "Individual User Prediction Performance" feature: When an admin enters a user ID, we could not only show the TIFU-KNN prediction but also show what a more basic model would have recommended. Then, using the logic from this script, we could display a "performance gain" metric that shows how much better our model is. This would be a very convincing live demonstration.`