import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchManifests, type ManifestListItem } from "../api";
import { useTheme } from "../contexts/ThemeProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/shadcn/Card";
import { Button } from "../components/shadcn/Button";
import { Moon, Sun } from "lucide-react";

export default function ManifestList() {
  const [manifests, setManifests] = useState<ManifestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetchManifests()
      .then(setManifests)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading manifests...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            NanoAPI - Manifests
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
        </div>

        {manifests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-muted-foreground">No manifests found.</p>
              <p className="text-sm text-muted-foreground">
                Run{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                  napi generate
                </code>{" "}
                to create your first manifest.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {manifests.map((m) => (
              <Card key={m.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-md text-xs font-medium mr-2">
                        {m.branch}
                      </span>
                      <code className="text-sm font-mono text-muted-foreground">
                        {m.commitSha.substring(0, 7)}
                      </code>
                    </CardTitle>
                    <Button asChild size="sm">
                      <Link to={`/manifests/${m.id}`}>View</Link>
                    </Button>
                  </div>
                  <CardDescription>
                    {m.fileCount} files &middot; Commit{" "}
                    {new Date(m.commitShaDate).toLocaleDateString()} &middot;
                    Generated {new Date(m.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
