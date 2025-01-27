import { useState } from 'react';

export default function AccountMenu() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <>
      {loggedIn ? (
        <div className="flex bg-hover-light hover:bg-hover-translucentLight rounded-lg border-[1px] border-card-borderLight dark:border-card-borderDark transition-all">
        <button className="flex gap-x-3 items-center pl-2 pr-3 my-auto">
          <img className="w-8 h-8 rounded-full" src="https://randomuser.me/api/portraits/men/75.jpg" alt="Profile" />
          <svg fill="currentColor" width="20px" height="20px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.844 6.050c-0.256-0.256-0.381-0.581-0.381-0.975s0.125-0.719 0.381-0.975 0.581-0.381 0.975-0.381h28.512c0.394 0 0.719 0.125 0.975 0.381s0.381 0.581 0.381 0.975-0.125 0.719-0.381 0.975-0.581 0.381-0.975 0.381h-28.512c-0.394 0-0.719-0.125-0.975-0.381zM31.306 14.963c0.256 0.256 0.381 0.581 0.381 0.975s-0.125 0.719-0.381 0.975-0.581 0.381-0.975 0.381h-28.512c-0.394 0-0.719-0.125-0.975-0.381s-0.381-0.581-0.381-0.975 0.125-0.719 0.381-0.975 0.581-0.381 0.975-0.381h28.512c0.394 0 0.719 0.125 0.975 0.381zM31.306 25.819c0.256 0.256 0.381 0.581 0.381 0.975s-0.125 0.719-0.381 0.975-0.581 0.381-0.975 0.381h-28.512c-0.394 0-0.719-0.125-0.975-0.381s-0.381-0.581-0.381-0.975 0.125-0.719 0.381-0.975 0.581-0.381 0.975-0.381h28.512c0.394 0 0.719 0.131 0.975 0.381z"></path>
        </svg>
        </button>
      </div>
      ) : (
        <div className="flex bg-transparent hover:bg-hover-light dark:hover:bg-hover-dark rounded-lg border-[1px] border-primary-light dark:border-primary-dark transition-all">
          <button className="flex gap-x-3 items-center px-4 my-auto">
            <p className='text-primary-light dark:text-primary-dark'>Log in</p>
          </button>
        </div>
      )}
    </>
  )
}