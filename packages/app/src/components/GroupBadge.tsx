export default function GroupBadge(props: { name: string }) {
  return (
    <div className="px-2 py-1 bg-[#FFFFFF1A] rounded-lg  text-text-dark border border-primary-dark">
      {props.name}
    </div>
  );
}
