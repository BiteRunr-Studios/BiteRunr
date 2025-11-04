import { IonButton, IonHeader, IonIcon, IonToolbar } from "@ionic/react";
import { menuController } from "@ionic/core/components";
import { notificationsOutline } from "ionicons/icons";

const Header: React.FC = () => {
    async function showNotifications() {
        await menuController.open("end");
    }

    return (
        <IonHeader>
            <IonToolbar>
                <div className="flex m-auto items-center justify-between py-4 px-6">
                    <img
                        className="w-20"
                        src="public/app-logo.svg"
                        alt="logo"
                    />
                    <IonButton
                        className="p-0"
                        fill="default"
                        onClick={showNotifications}
                        aria-label="Open notifications menu"
                    >
                        <IonIcon
                            className="text-(--ion-tab-bar-color-selected) w-7 h-7"
                            icon={notificationsOutline}
                        />
                    </IonButton>
                </div>
            </IonToolbar>
        </IonHeader>
    );
};

export default Header;
