import { useIsMobile } from "@/hooks/use-is-mobile";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

interface BaseProps {
    children?: React.ReactNode
}

interface RootModalProps extends BaseProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onClose?: () => void
}

interface ModalProps extends BaseProps {
    className?: string
    asChild?: true
}

const Modal = ({ children, ...props }: RootModalProps) => {
    const isDesktop = !useIsMobile();
    const Modal = isDesktop ? Dialog : Drawer

    if (props.onClose && props.onOpenChange) {
        throw new Error("You can't use both onClose and onOpenChange.");
    }

    if (props.onClose) {
        props.onOpenChange = (open) => {
            if (!open) {
                props.onClose!();
            }
        };
    }

    return <Modal {...props}>{children}</Modal>;
}

const ModalTrigger = ({ className, children, ...props }: ModalProps) => {
    const isDesktop = !useIsMobile();
    const ModalTrigger = isDesktop ? DialogTrigger : DrawerTrigger

    return (
        <ModalTrigger className={className} {...props}>
            {children}
        </ModalTrigger>
    )
}

const ModalClose = ({ className, children, ...props }: ModalProps) => {
    const isDesktop = !useIsMobile();
    const ModalClose = isDesktop ? DialogClose : DrawerClose

    return (
        <ModalClose className={className} {...props}>
            {children}
        </ModalClose>
    )
}

const ModalContent = ({ className, children, ...props }: ModalProps & {disableClose?: boolean}) => {
    const isDesktop = !useIsMobile();
    const ModalContent = isDesktop ? DialogContent : DrawerContent

    if (props.disableClose) {
        (props as ComponentProps<typeof DialogContent>).showCloseButton = false;
    }

    return (
        <ModalContent className={className} {...props}>
            {children}
        </ModalContent>
    )
}

const ModalDescription = ({
    className,
    children,
    ...props
}: ModalProps) => {
    const isDesktop = !useIsMobile();
    const ModalDescription = isDesktop ? DialogDescription : DrawerDescription

    return (
        <ModalDescription className={className} {...props}>
            {children}
        </ModalDescription>
    )
}

const ModalHeader = ({ className, children, ...props }: ModalProps) => {
    const isDesktop = !useIsMobile();
    const ModalHeader = isDesktop ? DialogHeader : DrawerHeader

    return (
        <ModalHeader className={className} {...props}>
            {children}
        </ModalHeader>
    )
}

const ModalTitle = ({ className, children, ...props }: ModalProps) => {
    const isDesktop = !useIsMobile();
    const ModalTitle = isDesktop ? DialogTitle : DrawerTitle

    return (
        <ModalTitle className={className} {...props}>
            {children}
        </ModalTitle>
    )
}

const ModalBody = ({ className, children, ...props }: ModalProps) => {
    return (
        <div className={cn("px-4 md:px-0", className)} {...props}>
            {children}
        </div>
    )
}

const ModalFooter = ({ className, children, ...props }: ModalProps) => {
    const isDesktop = !useIsMobile();
    const ModalFooter = isDesktop ? DialogFooter : DrawerFooter

    return (
        <ModalFooter className={className} {...props}>
            {children}
        </ModalFooter>
    )
}

export {
    Modal,
    ModalTrigger,
    ModalClose,
    ModalContent,
    ModalDescription,
    ModalHeader,
    ModalTitle,
    ModalBody,
    ModalFooter,
}