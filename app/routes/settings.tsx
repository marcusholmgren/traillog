import {useState, useRef} from 'react';
import {Button} from '~/components/button'
import {Dialog, DialogActions, DialogBody, DialogTitle} from '~/components/dialog'
import {Heading} from '~/components/heading'
import {clearAllWaypoints, exportWaypoints, importWaypoints, exportRoutes, importRoutes} from "~/services/db";
import {Text} from "~/components/text";


export default function Settings() {
    const [deleteAllDialog, setDeleteAllDialog] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const routeFileInputRef = useRef<HTMLInputElement>(null);

    const handleDeleteAllData = async () => {
        await clearAllWaypoints();
        setDeleteAllDialog(false);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
    };

    const handleExportWaypoints = async () => {
        try {
            const geoJsonString = await exportWaypoints();
            const blob = new Blob([geoJsonString], {type: "application/json"});
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
        } catch (error) {
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            console.error("Error exporting waypoints:", error);
        }
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
        try {
            const jsonString = await exportRoutes();
            const blob = new Blob([jsonString], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "routes.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
        } catch (error) {
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            console.error("Error exporting routes:", error);
        }
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
                    <Button color="red" onClick={() => setDeleteAllDialog(true)} className="mt-2">
                        Delete all waypoints
                    </Button>
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
                    <DialogActions>
                        <Button color="red" onClick={handleDeleteAllData}>
                            Delete
                        </Button>
                        <Button onClick={() => setDeleteAllDialog(false)}>
                            Cancel
                        </Button>
                    </DialogActions>
                </DialogBody>
            </Dialog>
        </div>
    );
}