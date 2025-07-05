declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly API_URL: string;
    readonly PARCEL_BUNDLE_ANALYZER?: string;
    readonly PARCEL_DETAILED_REPORT?: string;
    readonly EVALUATION_SAMPLE_SIZE?: string;
  }
}