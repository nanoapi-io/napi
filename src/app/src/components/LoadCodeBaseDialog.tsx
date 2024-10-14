import { Button, Dialog } from "@radix-ui/themes";

export default function LoadCodeBaseDialog(props: {
  onLoad: (entrypoint: string, targetDir?: string) => void;
}) {
  async function handleAction() {
    props.onLoad("src/index.ts");
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button color="purple">Load codebase</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Load codebase</Dialog.Title>
        <Dialog.Description>
          In order to load a representation of your codebase, please provide the
          entrypoint file of your application. We will then build a
          representation of your application endpoints.
        </Dialog.Description>
        <div className="flex justify-end gap-2 mt-2">
          <Dialog.Close>
            <Button color="red">Cancel</Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button color="green" onClick={handleAction}>
              Load
            </Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
