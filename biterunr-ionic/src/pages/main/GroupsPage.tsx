import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
} from "@ionic/react";

const GroupsPage: React.FC = () => {
    return (
        <IonPage>
            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">Groups</IonTitle>
                    </IonToolbar>
                </IonHeader>
                Groups
            </IonContent>
        </IonPage>
    );
};

export default GroupsPage;
