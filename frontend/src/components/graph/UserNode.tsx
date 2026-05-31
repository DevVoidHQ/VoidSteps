import HiddenHandles from './HiddenHandles';

interface UserNodeData {
  label: string;
}

export default function UserNode({ data }: { data: UserNodeData }) {
  return (
    <div className="px-8 py-6 rounded-full border-2 border-primary shadow-xl" style={{ backgroundColor: 'hsl(var(--background))' }}>
      <HiddenHandles />
      <div className="font-bold text-2xl text-center text-foreground">{data.label}</div>
    </div>
  );
}
