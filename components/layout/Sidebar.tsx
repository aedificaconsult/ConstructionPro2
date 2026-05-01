import React, { useEffect, useState } from 'react';
import { MenuIcon } from '@heroicons/react/outline';

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Check localStorage for the sidebar state
        const storedState = localStorage.getItem('sidebarState');
        if (storedState) {
            setIsOpen(JSON.parse(storedState));
        }
    }, []);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        localStorage.setItem('sidebarState', JSON.stringify(!isOpen));
    };

    const handleNavClick = () => {
        if (!isDesktop) {
            setIsOpen(false);
            localStorage.setItem('sidebarState', 'false');
        }
    };

    return (
        <div>
            {isDesktop ? (
                <div className={`flex flex-col ${isOpen ? 'w-64' : 'w-20'} transition-all duration-300`}>
                    <div className="flex items-center justify-between p-4 bg-gray-800 text-white">
                        <h2 className={`text-xl ${isOpen ? 'block' : 'hidden'}`}>Navigation</h2>
                        <button onClick={handleToggle} className="text-xl">
                            {isOpen ? '⨯' : '☰'}
                        </button>
                    </div>
                    <nav className="flex flex-col">
                        <a onClick={handleNavClick} className="p-4 hover:bg-gray-700">Item 1</a>
                        <a onClick={handleNavClick} className="p-4 hover:bg-gray-700">Item 2</a>
                        <a onClick={handleNavClick} className="p-4 hover:bg-gray-700">Item 3</a>
                    </nav>
                </div>
            ) : (
                <div>
                    <button onClick={handleToggle} className="p-4">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                    {isOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-50"> {/* Overlay */}
                            <div className="absolute left-0 top-0 w-2/3 bg-white h-full shadow-lg transition-transform transform -translate-x-full duration-300" style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
                                <button onClick={handleNavClick} className="absolute right-0 p-4">⨯</button>
                                <nav className="flex flex-col p-4">
                                    <a onClick={handleNavClick} className="p-4 hover:bg-gray-200">Item 1</a>
                                    <a onClick={handleNavClick} className="p-4 hover:bg-gray-200">Item 2</a>
                                    <a onClick={handleNavClick} className="p-4 hover:bg-gray-200">Item 3</a>
                                </nav>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Sidebar;