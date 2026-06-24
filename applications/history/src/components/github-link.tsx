import { Github } from "lucide-react";
import { Button } from "./ui/button";

export function GithubLink() {
  return (
    <Button variant="ghost" className="w-9 px-0" asChild>
      <a href="https://github.com/dataspecer/dataspecer">
        <Github className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">GitHub</span>
      </a>
    </Button>
  );
}
