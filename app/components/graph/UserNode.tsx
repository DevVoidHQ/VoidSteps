import HiddenHandles from "./HiddenHandles";

interface UserNodeData {
  label: string;
}

export default function UserNode({ data }: { data: UserNodeData }) {
  return (
    <div className="px-8 py-6 rounded-full bg-card shadow-elev-3">
      <HiddenHandles />
      <div className="type-page text-center text-foreground">{data.label}</div>
    </div>
  );
}
