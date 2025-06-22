import {useState} from 'react';
import {Button} from '~/components/button'
import {Dialog, DialogActions, DialogBody, DialogTitle} from '~/components/dialog'
import {Heading} from '~/components/heading'
import {clearAllWaypoints} from "~/services/db";


export default function Settings() {
    const [deleteAllDialog, setDeleteAllDialog] = useState(false);

    const handleDeleteAllData = async () => {
        await clearAllWaypoints()
    };

    return (
        <div>
            <Heading>Settings</Heading>
            <p>Manage your application settings here.</p>
            <Button color="red" onClick={() => setDeleteAllDialog(true)}>
                Delete all waypoints
            </Button>
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