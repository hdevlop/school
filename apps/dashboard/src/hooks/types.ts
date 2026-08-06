export type ApiError = Error & {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
};