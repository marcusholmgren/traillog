import type {Waypoint} from "~/services/db";
import {Fieldset, Legend, Field, Label, FieldGroup} from "~/components/fieldset";


type WaypointsListProps = {
    waypoints: Array<Waypoint>
}

export function WaypointsList({waypoints}: WaypointsListProps) {

    return (
        <Fieldset>
            <Legend>Saved Waypoints</Legend>
            <FieldGroup>
                {waypoints.length > 0 ? (
                    waypoints.map((wp) => (
                        <Field key={wp.id}>
                            <Label>{wp.name}</Label>
                            <div data-slot="description">{wp.notes}</div>
                        </Field>
                    ))
                ) : (
                    <div>No waypoints saved yet.</div>
                )}
            </FieldGroup>
        </Fieldset>
    );
}