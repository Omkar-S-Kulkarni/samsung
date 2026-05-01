import pandas as pd
import numpy as np

from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.impute import SimpleImputer


class HealthDataPreprocessor:
    def __init__(self, time_column=None, scaling="standard"):
        self.time_column = time_column
        self.scaling = scaling
        self.scaler = None
        self.imputer = SimpleImputer(strategy="mean")

    # -----------------------------
    # 1. Load & Basic Cleaning
    # -----------------------------
    def load_data(self, file_path):
        df = pd.read_csv(file_path)

        # Drop duplicates
        df = df.drop_duplicates()

        # Convert time column if exists
        if self.time_column and self.time_column in df.columns:
            df[self.time_column] = pd.to_datetime(df[self.time_column])
            df = df.sort_values(by=self.time_column)

        return df

    # -----------------------------
    # 2. Auto-detect columns
    # -----------------------------
    def detect_columns(self, df):
        numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
        return numeric_cols

    # -----------------------------
    # 3. Handle Missing Values
    # -----------------------------
    def handle_missing(self, df, numeric_cols):
        df[numeric_cols] = self.imputer.fit_transform(df[numeric_cols])
        return df

    # -----------------------------
    # 4. Noise Reduction (Smoothing)
    # -----------------------------
    def smooth_signals(self, df, cols, window=5):
        for col in cols:
            df[col] = df[col].rolling(window=window, min_periods=1).mean()
        return df

    # -----------------------------
    # 5. Feature Engineering
    # -----------------------------
    def create_features(self, df, cols):
        for col in cols:
            # Rolling stats
            df[f"{col}_mean"] = df[col].rolling(window=10, min_periods=1).mean()
            df[f"{col}_std"] = df[col].rolling(window=10, min_periods=1).std().fillna(0)

            # Trend (difference)
            df[f"{col}_diff"] = df[col].diff().fillna(0)

        return df

    # -----------------------------
    # 6. Outlier Handling
    # -----------------------------
    def remove_outliers(self, df, cols):
        for col in cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1

            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR

            df[col] = np.clip(df[col], lower, upper)

        return df

    # -----------------------------
    # 7. Scaling
    # -----------------------------
    def scale_data(self, df, cols):
        if self.scaling == "standard":
            self.scaler = StandardScaler()
        else:
            self.scaler = MinMaxScaler()

        df[cols] = self.scaler.fit_transform(df[cols])
        return df

    # -----------------------------
    # 8. Full Pipeline
    # -----------------------------
    def preprocess(self, file_path):
        df = self.load_data(file_path)

        numeric_cols = self.detect_columns(df)

        df = self.handle_missing(df, numeric_cols)
        df = self.smooth_signals(df, numeric_cols)
        df = self.remove_outliers(df, numeric_cols)
        df = self.create_features(df, numeric_cols)
        df = self.scale_data(df, numeric_cols)

        return df