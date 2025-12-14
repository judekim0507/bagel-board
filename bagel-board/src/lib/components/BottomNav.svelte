<script lang="ts">
    import { page } from "$app/stores";
</script>

<nav class="h-full flex items-center justify-between max-w-lg mx-auto w-full">
    <a
        href="/"
        class="flex items-center gap-2 rounded-full transition-all duration-200"
        class:text-white={$page.url.pathname === "/"}
        class:text-zinc-500={$page.url.pathname !== "/"}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            fill="currentColor"
            class="w-5 h-5"
        >
            <path
                d="M216,40V224a8,8,0,0,1-16,0V176H152a8,8,0,0,1-8-8,268.75,268.75,0,0,1,7.22-56.88c9.78-40.49,28.32-67.63,53.63-78.47A8,8,0,0,1,216,40Zm-96.11-1.31a8,8,0,1,0-15.78,2.63L111.89,88H88V40a8,8,0,0,0-16,0V88H48.11l7.78-46.68a8,8,0,1,0-15.78-2.63l-8,48A8.17,8.17,0,0,0,32,88a48.07,48.07,0,0,0,40,47.32V224a8,8,0,0,0,16,0V135.32A48.07,48.07,0,0,0,128,88a8.17,8.17,0,0,0-.11-1.31Z"
            />
        </svg>
        <span class="text-2xl font-medium">Waiter</span>
    </a>

    <a
        href="/kds"
        class="flex items-center gap-2 rounded-full transition-all duration-200"
        class:text-white={$page.url.pathname === "/kds"}
        class:text-zinc-500={$page.url.pathname !== "/kds"}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            fill="currentColor"
            class="w-5 h-5"
        >
            <path
                d="M88,48V16a8,8,0,0,1,16,0V48a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V16a8,8,0,0,0-16,0V48A8,8,0,0,0,128,56Zm32,0a8,8,0,0,0,8-8V16a8,8,0,0,0-16,0V48A8,8,0,0,0,160,56Zm94.4,35.2a8,8,0,0,0-11.2-1.6L224,104V80a8,8,0,0,0-8-8H40a8,8,0,0,0-8,8v24L12.8,89.6a8,8,0,0,0-9.6,12.8L32,124v60a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V124l28.8-21.6A8,8,0,0,0,254.4,91.2Z"
            />
        </svg>
        <span class="text-2xl font-medium">Kitchen</span>
    </a>

    <a
        href="/settings"
        class="flex items-center gap-2 rounded-full transition-all duration-200"
        class:text-white={$page.url.pathname === "/settings"}
        class:text-zinc-500={$page.url.pathname !== "/settings"}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            fill="currentColor"
            class="w-5 h-5"
        >
            <path
                d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"
            />
        </svg>
        <span class="text-2xl font-medium">Settings</span>
    </a>
</nav>
