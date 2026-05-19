import './i18n.js';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './tokens.css';
import App from './app.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <App />
  </BrowserRouter>
);
