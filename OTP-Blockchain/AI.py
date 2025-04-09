import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Simulated OTP request data
data = {
    "failed_attempts": [1, 5, 10, 20, 2, 0, 3, 7, 15, 25],
    "location_change": [0, 1, 1, 0, 0, 0, 1, 0, 1, 1],
    "time_of_day": [12, 3, 23, 18, 9, 14, 21, 4, 19, 2],  # 24-hour format
    "flagged_as_fraud": [0, 1, 1, 0, 0, 0, 1, 0, 1, 1]  # 1 = Fraud, 0 = Normal
}

# Convert data into Pandas DataFrame
df = pd.DataFrame(data)

# Split into training & test sets
X = df.drop(columns=["flagged_as_fraud"])
y = df["flagged_as_fraud"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train an AI Model (Random Forest)
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Test Model Accuracy
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print("Fraud Detection Model Accuracy:", accuracy * 100, "%")

# Function to detect fraud in new OTP requests
def detect_fraud(failed_attempts, location_change, time_of_day):
    input_data = np.array([[failed_attempts, location_change, time_of_day]])
    prediction = model.predict(input_data)
    return "Fraud Detected" if prediction[0] == 1 else "Legitimate OTP Request"

#  Detect fraud
print(detect_fraud(10, 1, 23))  # High failed attempts, suspicious location, late-night access
