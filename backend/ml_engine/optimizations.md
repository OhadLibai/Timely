# Optimization Blocks

## Recommended Optimization Parameters
The ideal values for these parameters depend on a trade-off between speed, accuracy, and available resources (CPU/RAM).
* MATRIX_NEIGHBOR_KNN_SEARCH_LIMIT: This parameter controls the real-time prediction speed.
* MAX_RECOMMENDER_VECTORS_LOAD (in precompute_all_vectors): This parameter is about managing memory during the build process.

## Optimization 1: K-NN Search Sampling
In the _knn_search function, instead of loading all possible recommender vectors to find neighbors, it randomly samples a smaller subset. This drastically reduces the search space and speeds up prediction time.

```
// From: __init__2.py

def _knn_search(self, query_vector: np.ndarray, k: int) -> Tuple[List[str], np.ndarray]:
    # ...
    user_ids = list(self.recommender_vectors.keys())
    
    # THIS IS THE OPTIMIZATION BLOCK
    # It limits the search to a random sample of 5000 neighbors
    if len(user_ids) > MATRIX_NEIGHBOR_KNN_SEARCH_LIMIT:
        sampled_ids = random.sample(user_ids, MATRIX_NEIGHBOR_KNN_SEARCH_LIMIT)
    else:
        sampled_ids = user_ids
    
    vectors_matrix = np.array([self.recommender_vectors[uid] for uid in sampled_ids])
    
    # The search is then performed only on this smaller matrix
    nbrs = NearestNeighbors(n_neighbors=k_actual, metric='cosine')
    nbrs.fit(vectors_matrix)
    # ...
```

## Optimization 2: Pre-computation Limiting
During the one-time precompute_all_vectors step, this version limits the number of vectors it generates and saves. This prevents out-of-memory errors on systems with limited RAM and keeps the resulting recommender_vectors.pkl file from becoming excessively large.

```
// From: __init__2.py

def precompute_all_vectors(self):
    # ...
    recommender_users = [str(uid) for uid in self.keyset.get('train', [])]
    
    # THIS IS THE OPTIMIZATION BLOCK
    MAX_RECOMMENDER_VECTORS_LOAD = 10000  # A hard limit on vectors to compute
    if len(recommender_users) > MAX_RECOMMENDER_VECTORS_LOAD:
        recommender_users = random.sample(recommender_users, MAX_RECOMMENDER_VECTORS_LOAD)
        print(f"⚡ Limiting vector computation to {MAX_RECOMMENDER_VECTORS_LOAD} users for performance")
    # ...
```