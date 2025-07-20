# `Core demands from the app:`

## #1 - Illustrate that the app is functioning:
We will demonstrate like this:
- Admin creates a user (being able to choose ANY Instacart's ID). There will be a designated section where he could write a number.
- This user is created and his purchase history based on Instacart dataset is being populated in the database for that user.
- Right after, this user will log in.
- The very order history of that user (taken from the csvs), will be shown in his past orders section. Exactly as if the user was using the app for long period of time.
- Then the ML prediction model will predict/generate for that user his next basket, by lets say auto basket generation button (or similar name or user request). This meant to fully achieve convincing working mechanism of the app.
The idea is that after the admin seed a user with his past purchases (pumped by the csv dataset) to the database - we have a "real" user that used the app for monthes. This simulates using the app for long period of time. We want to show how helpfull the app could be, assisting him with automated basket creation, driven by the ML model of the app. With several past orders the user can benefit from the gadget of auto basket generation.

## #2 - Model Performance Stats and Metrics:
The goal is to present our ML model prediction scores with dataset of Instacart we were given, with respect to well known next basket recommendation analysis and criteria.
The evaluations are done by evaluation module, which responsible for testing the ML model predictions and provide metrics upon that.
The performance measurements are taken over all users of Instacart dataset or part of it.
It should look like this:
- The admin has something like 'Evaluate Model'.
- He can choose a number of users evalutions can be performed on or run it on all users.
- When he trigger a request to see the model performance, model stats and metrics- calculations start to take place by the evaluation module.
- Once the scores are ready they are sent to be rendered to admin.
There are numerous evaluation aspects that can take place here and be rendered. Each aspect can be related with the files in the evaluation module.

## #3 - Individual User Prediction Performance
It will go like this:
- The admin enters a user ID (ANY Instacart's IDs he wants). There will be a designated place in the app for it.
- That user's ID order history is fetched from the csv. Also fetched is his ground-truth order based on the csv.
- These data will not be stored inside the database. This will be held temporarily, as it serves only for live demonstration.
- A prediction by the ML model will be executed based on this very user's ID order history.
- The predicted basket that calculated by the ML model will be compared side-by-side to the ground truth next order (present in the data in the csvs) of that user. Hopefully at this point the prediction by the model will match the real order.

## #4
Good shopping user experience at the frontent level, user's predicted request responsiveness, impressive visuals. General real app flow. We do not have to run an inventory. The database is primarily for user's past purchases storage, for the ML engine to recommend based on that.