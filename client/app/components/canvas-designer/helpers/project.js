app.factory("project", function() {

  var project = {};

  function startNewProject() {
    project.canSave = false;
    project.data = {};
    project.status = null;
    project.svg = null;
  }

  function determineSavability() {
    console.log('isSavable');
    if (isSomethingUploading()) {
      console.log('isSomethingUploading');
      project.status = "Uploading photo...";
      project.canSave = false;
      return;
    }
    else {
      project.status = null;
    }
    if (!allPhotosAreFilled()) {
      console.log('!allPhotosAreFilled');
      project.canSave = false;
      return;
    }
    project.canSave = true;
  }

  function isSomethingUploading() {
    if (!project.data.photos) {
      return false;
    }
    for (var id in project.data.photos) {
      if (project.data.photos[id].isUploading) {
        project.status = "Uploading photo...";
        return true;
      }
    }
    project.status = null;
    return false;
  }

  function allPhotosAreFilled() {
    if (!project.data.photos) {
      return false;
    }
    for (var id in project.data.photos) {
      if (!project.data.photos[id].src) {
        return false;
      }
    }
    return true;
  }

  project.determineSavability = determineSavability;
  project.startNewProject = startNewProject;
  return project;
});
