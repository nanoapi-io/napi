import { LuGitCommitVertical, LuCheck } from 'react-icons/lu';
import { DropdownMenu } from '@radix-ui/themes';

export default function CommitPicker(props: {
  commit: string;
  setCommit: (commit: string) => void;
  commitList: string[];
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button className="flex items-center bg-gray-300 dark:bg-primary-dark hover:bg-gray-400 dark:hover:bg-primary-hoverDark rounded-md p-1 outline-gray-500">
          <LuGitCommitVertical className="text-xl" />
          <p className='font-mono'>{props.commit}</p>
          <DropdownMenu.TriggerIcon className="mx-1 " />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content variant='soft' className='bg-foreground-light dark:bg-foreground-dark mt-1.5' size='2'>
        {props.commitList.map((c) => (
          <DropdownMenu.Item 
            key={c} 
            onClick={() => props.setCommit(c)}
            className='pl-0.5'>
            <button className='w-full flex gap-x-2 font-mono'>
              <LuCheck className={`text-md mt-0.5 ${c === props.commit ? '' : 'text-transparent'}`} />
              <p>{c}</p>
            </button>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}