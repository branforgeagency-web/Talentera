import React from "react";
import AiVideoAssessment from "./AiVideoAssessment.jsx";

export default function VideoUploadStage({ stage, existingData, onSaved }) {
  return (
    <div className="wiz-stage-container">
      <AiVideoAssessment existingData={existingData} onSaved={onSaved} />
    </div>
  );
}
