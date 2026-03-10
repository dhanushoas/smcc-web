const fs = require('fs');
const file = './src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    'toast.error(err.response?.data?.msg || "Failed to reverse last action");',
    'toast.error(err.response?.data?.message || err.response?.data?.msg || "Failed to reverse last action");'
);

fs.writeFileSync(file, content);
