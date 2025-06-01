import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../shadcn/Dialog.tsx";
import { Button } from "../../shadcn/Button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../shadcn/Card.tsx";
import { Alert, AlertDescription, AlertTitle } from "../../shadcn/Alert.tsx";
import { Separator } from "../../shadcn/Separator.tsx";
import { Code, Copy, Info, Terminal } from "lucide-react";
import { ScrollArea } from "../../shadcn/Scrollarea.tsx";
import { toast } from "sonner";

export default function SymbolExtractionDialog(props: {
  children: React.ReactNode;
  filePath: string;
  symbolIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCommand = () => {
    const symbolOptions = props.symbolIds.map((symbolId) => {
      return `--symbol="${props.filePath}|${symbolId}"`;
    });
    return `napi extract ${symbolOptions.join(" ")}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateCommand());
      setCopied(true);
      toast.info("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.children}
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto">
        <ScrollArea>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal />
              Extract Symbol(s) via CLI
            </DialogTitle>
            <DialogDescription>
              Use the NAPI CLI to extract symbols from your program.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTitle className="flex items-center gap-2">
                <Info />
                Prerequisites
              </AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <div>
                  Ensure you have a NAPI manifest generated locally:
                </div>
                <code className="bg-muted p-1 rounded text-sm">
                  napi manifest generate
                </code>
              </AlertDescription>
            </Alert>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code />
                    Command
                  </div>
                  <Button variant="outline" onClick={copyToClipboard}>
                    <Copy />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-sm font-mono flex-1 break-all">
                  {generateCommand()}
                </code>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
