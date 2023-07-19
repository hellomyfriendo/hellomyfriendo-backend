import {
  Firestore,
  FirestoreDataConverter,
  Timestamp,
} from '@google-cloud/firestore';
import {Storage} from '@google-cloud/storage';
import {fileTypeFromBuffer} from 'file-type';
import {} from 'lodash';
import {Want, WantImage, WantLocation, WantVisibility} from '../../models';
import {NotFoundError} from '../../../errors';
import {UsersService} from '../../../users';

const wantConverter: FirestoreDataConverter<Want> = {
  toFirestore: function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    modelObject: FirebaseFirestore.WithFieldValue<Want>
  ): FirebaseFirestore.DocumentData {
    throw new Error('Function not implemented.');
  },

  fromFirestore: function (
    snapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
  ): Want {
    const data = snapshot.data();

    return {
      id: snapshot.id,
      creator: data.creator,
      admins: data.admins,
      title: data.title,
      description: data.description,
      visibility: data.visibility,
      location: data.location,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  },
};

interface WantsServiceSettings {
  firestore: {
    client: Firestore;
    collections: {
      wants: string;
    };
  };
  storage: {
    client: Storage;
    buckets: {
      wantsImages: string;
    };
  };
  usersService: UsersService;
}

interface CreateWantOptions {
  creator: string;
  title: string;
  description: string;
  visibility: WantVisibility;
  location: WantLocation;
}

interface UpdateWantOptions {
  admins?: string[];
  title?: string;
  description?: string;
  visibility?: WantVisibility;
  location?: WantLocation;
  imageData: Buffer;
}

class WantsService {
  constructor(private readonly settings: WantsServiceSettings) {}

  async createWant(options: CreateWantOptions) {
    const creator = await this.settings.usersService.getUserById(
      options.creator
    );

    if (!creator) {
      throw new NotFoundError(`Creator id ${options.creator} not found`);
    }

    const now = new Date();

    const wantDocRef = await this.settings.firestore.client
      .collection(this.settings.firestore.collections.wants)
      .add({
        creator: creator.id,
        admins: [creator.id],
        title: options.title,
        description: options.description,
        visibility: options.visibility,
        location: options.location,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

    return await this.getWantById(wantDocRef.id)!;
  }

  async getWantById(wantId: string) {
    const userDocSnapshot = await this.settings.firestore.client
      .doc(`${this.settings.firestore.collections.wants}/${wantId}`)
      .withConverter(wantConverter)
      .get();

    const userDocData = userDocSnapshot.data();

    return userDocData;
  }

  async updateWantById(wantId: string, updateWantOptions: UpdateWantOptions) {
    const wantDocRef = this.settings.firestore.client.doc(
      `${this.settings.firestore.collections.wants}/${wantId}`
    );

    const wantDocSnapshot = await wantDocRef.get();

    const wantData = wantDocSnapshot.data();

    if (!wantData) {
      throw new NotFoundError(`Want ${wantId} not found`);
    }

    if (!Object.values(updateWantOptions).some(option => option)) {
      return (await this.getWantById(wantId))!;
    }

    await this.settings.firestore.client.runTransaction(async t => {
      if (updateWantOptions.admins) {
        wantData.admins = updateWantOptions.admins;
      }

      if (updateWantOptions.title) {
        wantData.title = updateWantOptions.title;
      }

      if (updateWantOptions.description) {
        wantData.description = updateWantOptions.description;
      }

      if (updateWantOptions.visibility) {
        wantData.visibility = updateWantOptions.visibility;
      }

      if (updateWantOptions.location) {
        wantData.location = updateWantOptions.location;
      }

      if (updateWantOptions.imageData) {
        const imageUrl = await this.uploadWantImage(
          wantId,
          updateWantOptions.imageData
        );

        const wantImage: WantImage = {
          url: imageUrl,
        };

        wantData.image = wantImage;
      }

      t.update(wantDocRef, {
        ...wantData,
        updatedAt: Timestamp.now(),
      });
    });

    return (await this.getWantById(wantId))!;
  }

  private async uploadWantImage(wantId: string, imageData: Buffer) {
    const want = await this.getWantById(wantId);

    if (!want) {
      throw new NotFoundError(`Want ${wantId} not found`);
    }

    const fileType = await fileTypeFromBuffer(imageData);

    if (!fileType) {
      throw new RangeError('Could not determine fileType from imageData');
    }

    // TODO(Marcus): Check for allowed file types?
    const fileName = `${wantId}.${fileType.ext}`;

    const gcsFile = this.settings.storage.client
      .bucket(this.settings.storage.buckets.wantsImages)
      .file(fileName);

    await gcsFile.save(imageData);

    return gcsFile.publicUrl();
  }
}

export {WantsService};
