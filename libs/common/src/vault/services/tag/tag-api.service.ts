import { ApiService } from "../../../abstractions/api.service";
import { UserId } from "../../../types/guid";
import { TagApiServiceAbstraction } from "../../../vault/abstractions/tag/tag-api.service.abstraction";
import { InternalTagService } from "../../../vault/abstractions/tag/tag.service.abstraction";
import { TagData } from "../../../vault/models/data/tag.data";
import { Tag } from "../../../vault/models/domain/tag";
import { TagRequest } from "../../../vault/models/request/tag.request";
import { TagResponse } from "../../../vault/models/response/tag.response";

export class TagApiService implements TagApiServiceAbstraction {
  constructor(
    private tagService: InternalTagService,
    private apiService: ApiService,
  ) {}

  async save(tag: Tag, userId: UserId): Promise<TagData> {
    const request = new TagRequest(tag);

    let response: TagResponse;
    if (tag.id == null) {
      response = await this.postTag(request);
      tag.id = response.id;
    } else {
      response = await this.putTag(tag.id, request);
    }

    const data = new TagData(response);
    await this.tagService.upsert(data, userId);
    return data;
  }

  async delete(id: string, userId: UserId): Promise<any> {
    await this.deleteTag(id);
    await this.tagService.delete(id, userId);
  }

  async deleteAll(userId: UserId): Promise<void> {
    await this.apiService.send("DELETE", "/tags/all", null, true, false);
    await this.tagService.clear(userId);
  }

  async get(id: string): Promise<TagResponse> {
    const r = await this.apiService.send("GET", "/tags/" + id, null, true, true);
    return new TagResponse(r);
  }

  private async postTag(request: TagRequest): Promise<TagResponse> {
    const r = await this.apiService.send("POST", "/tags", request, true, true);
    return new TagResponse(r);
  }

  async putTag(id: string, request: TagRequest): Promise<TagResponse> {
    const r = await this.apiService.send("PUT", "/tags/" + id, request, true, true);
    return new TagResponse(r);
  }

  private deleteTag(id: string): Promise<any> {
    return this.apiService.send("DELETE", "/tags/" + id, null, true, false);
  }
}
