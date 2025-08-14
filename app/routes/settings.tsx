import {useState, useRef, useEffect} from 'react';
import {Button} from '~/components/button'
import {Dialog, DialogActions, DialogBody, DialogTitle} from '~/components/dialog'
import {Heading} from '~/components/heading'
import {
    clearAllWaypoints,
    exportWaypoints,
    importWaypoints,
    exportRoutes,
    importRoutes,
    clearAllRoutes,
    deleteDatabase,
    getStorageEstimate
} from "~/services/db";
import {Text} from "~/components/text";
import {TrashIcon} from '@heroicons/react/24/outline';


export default function Settings() {
    const [deleteAllDialog, setDeleteAllDialog] = useState(false);
    const [deleteRoutesDialog, setDeleteRoutesDialog] = useState(false);
    const [deleteDatabaseDialog, setDeleteDatabaseDialog] = useState(false);
    const [storage, setStorage] = useState<{ usage: number, quota: number } | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const routeFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getStorageEstimate().then(setStorage);
    }, []);

    const handleDeleteAllData = async () => {
        await clearAllWaypoints();
        setDeleteAllDialog(false);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
    };

    const handleDeleteAllRoutes = async () => {
        await clearAllRoutes();
        setDeleteRoutesDialog(false);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
    }

    const handleDeleteDatabase = async () => {
        await deleteDatabase();
        setDeleteDatabaseDialog(false);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
    }

    const handleExportWaypoints = async () => {
        const worker = new Worker(new URL('../workers/export-waypoints.worker.ts', import.meta.url), { type: 'module' });

        worker.onmessage = (event) => {
            const jsonString = event.data;
            const blob = new Blob([jsonString], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "waypoints.geojson";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
            worker.terminate();
        };

        worker.onerror = (error) => {
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            console.error("Error exporting waypoints:", error);
            worker.terminate();
        };

        worker.postMessage("export");
    };

    const handleImportWaypoints = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const geoJsonString = e.target?.result as string;
                    await importWaypoints(geoJsonString);
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);
                } catch (error) {
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                    console.error("Error importing waypoints:", error);
                }
            };
            reader.readAsText(file);
        }
    };

    const handleExportRoutes = async () => {
        const worker = new Worker(new URL('../workers/export-routes.worker.ts', import.meta.url), { type: 'module' });

        worker.onmessage = (event) => {
            const jsonString = event.data;
            const blob = new Blob([jsonString], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "routes.geojson";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
            worker.terminate();
        };

        worker.onerror = (error) => {
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            console.error("Error exporting routes:", error);
            worker.terminate();
        };

        worker.postMessage("export");
    };

    const handleImportRoutes = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const jsonString = e.target?.result as string;
                    await importRoutes(jsonString);
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);
                } catch (error) {
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                    console.error("Error importing routes:", error);
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div>
            <Heading>Settings</Heading>
            <p>Manage your application settings here.</p>

            {showSuccessMessage && <Text color="green">Operation successful!</Text>}
            {showErrorMessage && <Text color="red">An error occurred.</Text>}

            <div className="mt-4 space-y-4">
                <div>
                    <Heading level={2}>Storage</Heading>
                    {storage && (
                        <Text>
                            Using {(storage.usage / 1024 / 1024).toFixed(2)} MB of {(storage.quota / 1024 / 1024).toFixed(2)} MB
                        </Text>
                    )}
                </div>
                <div>
                    <Heading level={2}>Waypoints</Heading>
                    <div className="flex space-x-2 mt-2">
                        <Button onClick={() => fileInputRef.current?.click()}>Import Waypoints</Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{display: "none"}}
                            accept=".geojson"
                            onChange={handleImportWaypoints}
                            data-testid="import-waypoints-input"
                        />
                        <Button onClick={handleExportWaypoints}>Export Waypoints</Button>
                    </div>
                </div>

                <div>
                    <Heading level={2}>Routes</Heading>
                     <div className="flex space-x-2 mt-2">
                        <Button onClick={() => routeFileInputRef.current?.click()}>Import Routes</Button>
                        <input
                            type="file"
                            ref={routeFileInputRef}
                            style={{display: "none"}}
                            accept=".json"
                            onChange={handleImportRoutes}
                            data-testid="import-routes-input"
                        />
                        <Button onClick={handleExportRoutes}>Export Routes</Button>
                    </div>
                </div>

                <div>
                    <Heading level={2}>Danger Zone</Heading>
                    <div className="flex space-x-2 mt-2">
                        <Button color="red" onClick={() => setDeleteAllDialog(true)}>
                            Delete all waypoints
                        </Button>
                        <Button color="red" onClick={() => setDeleteRoutesDialog(true)}>
                            Delete all routes
                        </Button>
                        <Button color="red" onClick={() => setDeleteDatabaseDialog(true)}>
                            <TrashIcon className="h-5 w-5"/>
                            Delete all data
                        </Button>
                    </div>
                </div>
            </div>


            <Dialog
                open={deleteAllDialog}
                onClose={() => setDeleteAllDialog(false)}
            >
                <DialogTitle>Delete all waypoints</DialogTitle>
                <DialogBody>
                    <p>
                        Are you sure you want to delete ALL waypoint data? This action cannot be undone.
                    </p>
                </DialogBody>
                <DialogActions>
                    <Button color="red" onClick={handleDeleteAllData}>
                        Delete
                    </Button>
                    <Button onClick={() => setDeleteAllDialog(false)}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteRoutesDialog}
                onClose={() => setDeleteRoutesDialog(false)}
            >
                <DialogTitle>Delete all routes</DialogTitle>
                <DialogBody>
                    <p>
                        Are you sure you want to delete ALL route data? This action cannot be undone.
                    </p>
                </DialogBody>
                <DialogActions>
                    <Button color="red" onClick={handleDeleteAllRoutes}>
                        Delete
                    </Button>
                    <Button onClick={() => setDeleteRoutesDialog(false)}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteDatabaseDialog}
                onClose={() => setDeleteDatabaseDialog(false)}
            >
                <DialogTitle>Delete all data</DialogTitle>
                <DialogBody>
                    <p>
                        Are you sure you want to delete ALL data? This action will remove the entire database and cannot be undone.
                    </p>
                </DialogBody>
                <DialogActions>
                    <Button color="red" onClick={handleDeleteDatabase}>
                        Delete
                    </Button>
                    <Button onClick={() => setDeleteDatabaseDialog(false)}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}