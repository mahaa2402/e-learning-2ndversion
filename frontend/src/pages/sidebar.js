import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Zap, Users, Activity } from 'lucide-react'; // Replace with your icon library
import './sidebar.css';

const sidebarItems = [
    { icon: BarChart, label: 'Reports', path: '/admindashboard' },
    { icon: Zap, label: 'Create Course', path: '/admincourses' },
    { icon: Users, label: 'Assign Course', path: '/assigntask' },
    { icon: Activity, label: 'Activities', path: '/employeetracking' },
];

function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleItemClick = (path) => {
        navigate(path);
    };

    return (
        <div className="sidebar">
            {sidebarItems.map((item, index) => (
                <div
                    key={index}
                    className={`sidebar-item ${location.pathname === item.path ? 'sidebar-active' : ''}`}
                    onClick={() => handleItemClick(item.path)}
                >
                    <item.icon className="sidebar-icon" />
                    <span className="sidebar-label">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

export default Sidebar;
