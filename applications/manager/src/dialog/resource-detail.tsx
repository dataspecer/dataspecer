import { lng } from "@/Dir"
import { Time } from "@/components/time"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { modelTypeToName } from "@/known-models"
import { ResourcesContext } from "@/package"
import { Pencil, Trash2 } from "lucide-react"
import { useContext } from "react"

export const ResourceDetail = ({isOpen, close, iri}: {isOpen: boolean, close: () => void, iri: string}) => {
  const resource = useContext(ResourcesContext)[iri]!;

  return (
    <Drawer open={isOpen} onOpenChange={(value: boolean) => value ? null : close()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{lng(resource.userMetadata?.label)}</DrawerTitle>
          <DrawerDescription>
          {modelTypeToName[resource.types?.[0]]}
          {lng(resource.userMetadata?.description)}
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-x-4 p-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <strong>Vytvořeno: </strong>
            <span className="col-span-2"><Time time={resource.metadata.creationDate} /></span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <strong>Upraveno: </strong>
            <span className="col-span-2"><Time time={resource.metadata.modificationDate} /></span>
          </div>
        </div>
        <DrawerFooter>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={close} variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Odstranit</Button>
            <Button onClick={close} variant="outline"><Pencil className="mr-2 h-4 w-4" /> Přejmenovat</Button>
          </div>
          <Button onClick={close}>Editovat</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
