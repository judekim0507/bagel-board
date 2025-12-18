<script lang="ts">
    import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
    import AlertTriangle from "lucide-svelte/icons/alert-triangle";

    interface Props {
        open?: boolean;
        title?: string;
        description?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: "default" | "destructive";
    }

    let {
        open = $bindable(false),
        title = $bindable("Are you sure?"),
        description = $bindable(""),
        confirmText = $bindable("Continue"),
        cancelText = $bindable("Cancel"),
        variant = $bindable("default")
    }: Props = $props();

    let resolvePromise: ((value: boolean) => void) | null = null;

    export function confirm(options: {
        title?: string;
        description?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: "default" | "destructive";
    } = {}): Promise<boolean> {
        title = options.title ?? "Are you sure?";
        description = options.description ?? "";
        confirmText = options.confirmText ?? "Continue";
        cancelText = options.cancelText ?? "Cancel";
        variant = options.variant ?? "default";
        open = true;

        return new Promise((resolve) => {
            resolvePromise = resolve;
        });
    }

    function handleConfirm() {
        open = false;
        resolvePromise?.(true);
        resolvePromise = null;
    }

    function handleCancel() {
        open = false;
        resolvePromise?.(false);
        resolvePromise = null;
    }
</script>

<AlertDialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleCancel()}>
    <AlertDialog.Content class="dark bg-card border-border">
        <AlertDialog.Header>
            <AlertDialog.Title class="text-foreground flex items-center gap-2">
                {#if variant === "destructive"}
                    <AlertTriangle class="w-5 h-5 text-destructive" />
                {/if}
                {title}
            </AlertDialog.Title>
            {#if description}
                <AlertDialog.Description class="text-muted-foreground whitespace-pre-line">
                    {description}
                </AlertDialog.Description>
            {/if}
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel
                onclick={handleCancel}
                class="text-muted-foreground hover:text-foreground"
            >
                {cancelText}
            </AlertDialog.Cancel>
            <AlertDialog.Action
                onclick={handleConfirm}
                class={variant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""}
            >
                {confirmText}
            </AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
