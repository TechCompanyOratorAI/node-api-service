import subjectAreaService from "../services/subjectAreaService.js";

class SubjectAreaController {
  async list(req, res) {
    const result = await subjectAreaService.listSubjectAreas(req.query);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async getById(req, res) {
    const subjectAreaId = parseInt(req.params.id, 10);
    if (!Number.isInteger(subjectAreaId) || subjectAreaId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid subject area ID" });
    }

    const result = await subjectAreaService.getSubjectAreaById(subjectAreaId);
    return res.status(result.success ? 200 : 404).json(result);
  }

  async create(req, res) {
    const result = await subjectAreaService.createSubjectArea(req.body || {});
    return res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const subjectAreaId = parseInt(req.params.id, 10);
    if (!Number.isInteger(subjectAreaId) || subjectAreaId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid subject area ID" });
    }

    const result = await subjectAreaService.updateSubjectArea(subjectAreaId, req.body || {});
    return res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const subjectAreaId = parseInt(req.params.id, 10);
    if (!Number.isInteger(subjectAreaId) || subjectAreaId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid subject area ID" });
    }

    const result = await subjectAreaService.deleteSubjectArea(subjectAreaId);
    return res.status(result.success ? 200 : 400).json(result);
  }
}

export default new SubjectAreaController();
