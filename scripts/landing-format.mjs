import fs from 'node:fs';
import postcss from 'postcss';
const file = 'apps/dashboard/src/features/Landing/landing.css';
const root = postcss.parse(fs.readFileSync(file, 'utf8'));
function format(container, depth = 0) {
  container.each(node => {
    node.raws.before = '\n' + '  '.repeat(depth);
    if (node.type === 'decl') node.raws.between = ': ';
    if (node.nodes) {
      node.raws.between = ' ';
      node.raws.after = '\n' + '  '.repeat(depth);
      node.raws.semicolon = true;
      format(node, depth + 1);
    }
  });
}
format(root);
root.raws.after = '\n';
fs.writeFileSync(file, root.toString().trimStart());
