import './i18n.js';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './tokens.css';
import App from './app.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App />
  </HashRouter>
);
