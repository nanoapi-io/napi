import { useEffect, useState } from 'react';
import { DropdownMenu } from '@radix-ui/themes';
import LoginDialog from './LoginDialog';
import { data } from 'react-router';

export default function AccountMenu() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState("https://randomuser.me/api/portraits/men/75.jpg");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  const logOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    localStorage.removeItem('jwt');
    setLoggedIn(false);
  }

  const loadUser = async () => {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) return;

    const res = fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/v1/users/self`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      }
    })
    .then(res => res.json())
    .catch(err => console.error('Failed to fetch user data:', err));

    return res;
  }


  useEffect(() => {
    // Check if the user is logged in
    const jwt = localStorage.getItem('jwt');
    setLoggedIn(!!jwt);

    if (jwt) {
      // Get user data
      loadUser()
        .then((data) => {
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
          setAvatar(data.avatar);
          setName(data.name);
          setUsername(data.username);
        })
        .catch(err => console.error('Failed to fetch user data:', err));
    }
  }, []);

  return (
    <>
      {loggedIn ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <div className="flex bg-hover-light hover:bg-hover-translucentLight rounded-lg border-[1px] border-card-borderLight dark:border-card-borderDark transition-all">
              <button className="flex gap-x-3 items-center pl-2 pr-3 my-auto">
                <img className="w-8 h-8 rounded-full" src={avatar} alt="Profile" />
                <svg fill="currentColor" width="20px" height="20px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.844 6.050c-0.256-0.256-0.381-0.581-0.381-0.975s0.125-0.719 0.381-0.975 0.581-0.381 0.975-0.381h28.512c0.394 0 0.719 0.125 0.975 0.381s0.381 0.581 0.381 0.975-0.125 0.719-0.381 0.975-0.581 0.381-0.975 0.381h-28.512c-0.394 0-0.719-0.125-0.975-0.381zM31.306 14.963c0.256 0.256 0.381 0.581 0.381 0.975s-0.125 0.719-0.381 0.975-0.581 0.381-0.975 0.381h-28.512c-0.394 0-0.719-0.125-0.975-0.381s-0.381-0.581-0.381-0.975 0.125-0.719 0.381-0.975 0.581-0.381 0.975-0.381h28.512c0.394 0 0.719 0.125 0.975 0.381zM31.306 25.819c0.256 0.256 0.381 0.581 0.381 0.975s-0.125 0.719-0.381 0.975-0.581 0.381-0.975 0.381h-28.512c-0.394 0-0.719-0.125-0.975-0.381s-0.381-0.581-0.381-0.975 0.125-0.719 0.381-0.975 0.581-0.381 0.975-0.381h28.512c0.394 0 0.719 0.131 0.975 0.381z"></path>
              </svg>
              </button>
            </div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content variant='soft' className='bg-foreground-light dark:bg-foreground-dark mt-1.5'>
            <div className='flex p-4 gap-x-3'>
              <img className="w-10 h-10 rounded-full my-auto" src={avatar} alt="Profile" />
              <div>
                <h3 className='text-lg font-semibold'>{name}</h3>
                <p className='text-sm text-gray-500'>@{username}</p>
              </div>
            </div>
            <DropdownMenu.Separator />
            <DropdownMenu.Item className='hover:bg-primary-dark'>
              <button>Account & preferences</button>
            </DropdownMenu.Item>
            <DropdownMenu.Item className='hover:bg-primary-dark'>
              <button>Report a bug</button>
            </DropdownMenu.Item>
            <DropdownMenu.Item className='hover:bg-primary-dark'>
              <button>Request features</button>
            </DropdownMenu.Item>
            <DropdownMenu.Item className='hover:bg-primary-dark'>
              <button>Feedback</button>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item className='hover:bg-primary-dark'>
              <button onClick={logOut}>Log out</button>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      ) : (
        <LoginDialog />
      )}
    </>
  )
}