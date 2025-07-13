# Optimization Blocks

## Optimization 1: K-NN Search Sampling
In the _knn_search function, instead of loading all training vectors to find neighbors, it randomly samples a smaller subset. This drastically reduces the search space and speeds up prediction time.

```
// From: __init__2.py

def _knn_search(self, query_vector: np.ndarray, k: int) -> Tuple[List[str], np.ndarray]:
    # ...
    user_ids = list(self.training_vectors.keys())
    
    # THIS IS THE OPTIMIZATION BLOCK
    # It limits the search to a random sample of 5000 neighbors
    if len(user_ids) > KNN_NEIGHBOR_LOADING_SAMPLE:
        sampled_ids = random.sample(user_ids, KNN_NEIGHBOR_LOADING_SAMPLE)
    else:
        sampled_ids = user_ids
    
    vectors_matrix = np.array([self.training_vectors[uid] for uid in sampled_ids])
    
    # The search is then performed only on this smaller matrix
    nbrs = NearestNeighbors(n_neighbors=k_actual, metric='cosine')
    nbrs.fit(vectors_matrix)
    # ...
```

## Optimization 2: Pre-computation Limiting
During the one-time precompute_all_vectors step, this version limits the number of vectors it generates and saves. This prevents out-of-memory errors on systems with limited RAM and keeps the resulting training_vectors.pkl file from becoming excessively large.

```
// From: __init__2.py

def precompute_all_vectors(self):
    # ...
    training_users = [str(uid) for uid in self.keyset.get('train', [])]
    
    # THIS IS THE OPTIMIZATION BLOCK
    max_vectors = 10000  # A hard limit on vectors to compute
    if len(training_users) > max_vectors:
        training_users = random.sample(training_users, max_vectors)
        print(f"⚡ Limiting vector computation to {max_vectors} users for performance")
    # ...
```

## Recommended Optimization Parameters
The ideal values for these parameters depend on a trade-off between speed, accuracy, and available resources (CPU/RAM).

* KNN_NEIGHBOR_LOADING_SAMPLE (Default: 5,000): This parameter controls the real-time prediction speed.
    - Attitude: Start with the default of 5000. If predictions are too slow, you can lower it (e.g., to 2500), but this may slightly reduce recommendation quality. If you have a powerful server and need maximum accuracy, you could increase it (e.g., to 10000), but monitor the impact on response time. A value between 5% and 10% of your total training user count is a good rule of thumb.

* max_vectors (in precompute_all_vectors, Default: 20,000): This parameter is about managing memory during the build process.
    - Attitude: This should be set based on the available RAM of the machine performing the pre-computation. Each vector's size is determined by item_count (e.g., 49,688 floats).
    - Calculation: If one vector is ~200KB (49,688 * 4 bytes), then 20,000 vectors will consume about 4GB of RAM. You should set this to a number that fits comfortably in your build environment's memory, leaving room for the OS and other processes. The default of 20000 is a safe and reasonable choice for most environments.