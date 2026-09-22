// frontend/src/config.js
// Create this file to manage API URLs

const config = {
  API_URL: process.env.REACT_APP_API_URL || "",
};

export default config;

// Usage in your components:
// import config from './config';
// axios.get(`${config.API_URL}/api/nasa/image`)