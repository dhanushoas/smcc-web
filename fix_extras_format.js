const fs = require('fs');
const file = './src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// For regular extras
content = content.replace(/push\('WD' \+ amount\)/g, "push('W+' + amount)");
content = content.replace(/push\('NB' \+ amount\)/g, "push('NB+' + amount)");
content = content.replace(/push\('B' \+ amount\)/g, "push('B+' + amount)");
content = content.replace(/push\('LB' \+ amount\)/g, "push('LB+' + amount)");

content = content.replace(/push\('WD' \+ \(totalRuns \+ widePenalty\)\)/g, "push('W+' + (totalRuns + widePenalty))");
content = content.replace(/push\(\(ballType === 'b' \? 'B' : 'LB'\) \+ totalRuns\)/g, "push((ballType === 'b' ? 'B+' : 'LB+') + totalRuns)");

fs.writeFileSync(file, content);
