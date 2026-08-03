const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
          }
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

const adminPanelDir = path.join(__dirname, 'admin-panel', 'src');
const mobileAppDir = path.join(__dirname, 'RepairShopApp', 'src');

const rewriteImports = (files, appType) => {
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    if (appType === 'admin') {
      content = content.replace(/from\s+['"]@\/utils\/(billing|phone|formatCurrency)['"]/g, "from '@repairshop/shared'");
      content = content.replace(/from\s+['"]@\/types['"]/g, "from '@repairshop/shared'");
      content = content.replace(/from\s+['"]@\/components\/common\/StatusBadge['"]/g, "from '@repairshop/shared'");
    } else {
      content = content.replace(/from\s+['"](?:\.\.\/)+utils\/(billing|phone|formatCurrency)['"]/g, "from '@repairshop/shared'");
      content = content.replace(/from\s+['"](?:\.\.\/)+types['"]/g, "from '@repairshop/shared'");
      content = content.replace(/from\s+['"](?:\.\.\/)+components\/common\/StatusBadge['"]/g, "from '@repairshop/shared'");
    }

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log('Updated:', file);
    }
  });
};

walk(adminPanelDir, (err, results) => {
  if (err) throw err;
  rewriteImports(results, 'admin');
  console.log('Admin panel imports updated.');
});

walk(mobileAppDir, (err, results) => {
  if (err) throw err;
  rewriteImports(results, 'mobile');
  console.log('Mobile app imports updated.');
});
