import {RoomManage} from './RoomManage';
import {useRoom} from './useRoom';
import {Room} from './Room';
import {UseConfig, useConfig} from './useConfig';
import {Spinner} from '@heroui/react';

export const Router = () => {
    const config = useConfig();

    if (config.loading) {
        return (
            <div className="grid h-full place-items-center">
                <Spinner color="accent" size="lg" />
            </div>
        );
    }
    return <RouterLoadedConfig config={config} />;
};

const RouterLoadedConfig = ({config}: {config: UseConfig}) => {
    const {room, state, ...other} = useRoom(config);

    if (state) {
        return <Room state={state} {...other} />;
    }

    return <RoomManage room={room} config={config} />;
};
