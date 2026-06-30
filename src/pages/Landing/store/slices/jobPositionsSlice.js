import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const JOBS_URL = import.meta.env.VITE_JOBS_URL || `${import.meta.env.VITE_API_BASE_URL || 'https://application-maker.onrender.com/api/'}public/jobs/company/saber-group`;

export const getJobPositions = createAsyncThunk(
  'jobPositions/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(JOBS_URL);
      if (!res.ok) throw new Error('Failed to fetch positions');
      const data = await res.json();
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const jobPositionsSlice = createSlice({
  name: 'jobPositions',
  initialState: {
    positions: [],
    company: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getJobPositions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getJobPositions.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        state.positions = Array.isArray(payload) ? payload : payload?.data ?? [];
        state.company = payload?.company ?? null;
      })
      .addCase(getJobPositions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default jobPositionsSlice.reducer;
