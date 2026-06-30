import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import jobPositionsReducer from "../pages/Landing/store/slices/jobPositionsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    jobPositions: jobPositionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
