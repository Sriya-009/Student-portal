import { Link } from 'react-router-dom';

function Sidebar({ links = [] }) {
  return (
    <aside className="sidebar">
      <h3>Menu</h3>
      <nav>
        {links.map((item) => (
          <Link key={item.to} to={item.to} className="sidebar-link">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
