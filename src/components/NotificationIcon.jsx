import React from "react";
import { Badge, Button } from "antd";
import {
    AlertOutlined,
    BellOutlined
} from "@ant-design/icons";

const NotificationIcon = React.memo(({ count, hasDanger }) => {
    return (
        <Badge count={count} offset={[-2,8]}>
            <Button
                type="text"
                icon={
                    hasDanger ?
                    <AlertOutlined spin style={{fontSize:22,color:"#ff4d4f"}}/>
                    :
                    <BellOutlined style={{fontSize:22}}/>
                }
            />
        </Badge>
    );
});

export default NotificationIcon;