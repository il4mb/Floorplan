import { CaseSensitive } from "lucide-react";
import { Model } from "@/utils/model";

export default {

    type: "text",
    name: "Text",
    icon: (props) => <CaseSensitive {...props} />,
    render({ }) {

        return (
            <>

            </>
        )
    }
} as Model;